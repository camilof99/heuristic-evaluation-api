const express = require("express");
const bodyParser = require("body-parser");
const { Client } = require("pg");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new Client({
    user: "postgres",
    host: "roundhouse.proxy.rlwy.net",
    database: "railway",
    password: "wApndRvNtJeUdSedOadiWYAjIItYkvgo",
    port: 59439,
    ssl: {
        rejectUnauthorized: false, // Opción para evitar errores de "self signed certificate" en desarrollo (NO utilizar en producción)
    },
});

client.connect((error) => {
    if (error) {
        console.error("Error de conexión: ", error);
    } else {
        console.log("Conexión exitosa a la base de datos.");
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("====================================");
        console.log(email);
        console.log(password);
        console.log(req.body);
        console.log("====================================");

        const query_sql =
            "SELECT email, password FROM users WHERE email = $1 AND password = $2";

        client.query(query_sql, [email, password], (error, results) => {
            if (error) {
                console.error("Error en la consulta: ", error);
                res.status(500).send("Error interno del servidor.");
            } else if (results.rows.length === 0) {
                res.status(401).send("Credenciales inválidas.");
            } else {
                const user = results.rows[0];
                const token = jwt.sign({ id: user.id }, "mysecretkey");
                res.send({ token });
            }
        });
    } catch (error) {
        console.error("Error en la consulta: ", error);
        res.status(500).send("Error interno del servidor.");
    }
});

app.get("/api/projects", async (req, res) => {
    const query =
        "SELECT projects.*, evaluator.name AS evaluator_name, coordinator.name AS coordinator_name FROM projects LEFT JOIN users AS evaluator ON projects.id_evaluator = evaluator.id LEFT JOIN users AS coordinator ON projects.id_coordinator = coordinator.id order by id asc;";

    client.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results.rows);
    });
});

app.get("/api/projects/:id", async (req, res) => {
    const projectId = req.params.id;
    const query = "SELECT * FROM projects WHERE id = $1";

    client.query(query, [projectId], (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results.rows);
    });
});

app.post("/api/createProject", async (req, res) => {
    const { description, url, id_coordinator, id_evaluator } = req.body;

    const query =
        "INSERT INTO projects (description, url, id_coordinator, id_evaluator) VALUES ($1, $2, $3, $4) RETURNING *";

    client.query(
        query,
        [description, url, id_coordinator, id_evaluator],
        (error, results) => {
            if (error) {
                console.error(
                    "Error al insertar los datos de la tabla:",
                    error
                );
                res.status(500).json({ error: "Error al insertar los datos" });
                return;
            }

            res.json(results.rows);
        }
    );
});

app.get("/api/coordinators", async (req, res) => {
    const query = "SELECT * FROM users WHERE rol = 'coordinator'";

    client.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results.rows);
    });
});

app.get("/api/evaluators", async (req, res) => {
    const query = "SELECT * FROM users WHERE rol = 'evaluator'";

    client.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results.rows);
    });
});

app.get("/api/heuristics", async (req, res) => {
    const query =
        "SELECT c.*, h.description AS heuristic FROM criteria c JOIN heuristics h ON c.id_heuristic = h.id";

    client.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results.rows);
    });
});

app.post("/api/evaluate", async (req, res) => {
    const { ratings, idProject } = req.body;

    for (const key in ratings) {
        if (ratings.hasOwnProperty(key)) {
            const rating = ratings[key];
            const idHeuristic = rating.idHeuristic;
            const ratingValue = rating.rating;

            const datos = {
                valoration: ratingValue,
                id_project: idProject,
                id_heuristic: idHeuristic,
                id_criteria: key,
            };

            console.log("====================================");
            console.log(datos);
            console.log("====================================");

            const selectQuery =
                "SELECT * FROM evaluation WHERE id_project = $1 AND id_heuristic = $2 AND id_criteria = $3";

            client.query(
                selectQuery,
                [datos.id_project, datos.id_heuristic, datos.id_criteria],
                (error, results) => {
                    if (error) {
                        console.error(
                            "Error al verificar los datos existentes:",
                            error
                        );
                        return;
                    }

                    if (results.rows.length > 0) {
                        console.log(
                            "Ya existe un registro con los mismos valores."
                        );
                        return;
                    }

                    const insertQuery =
                        "INSERT INTO evaluation (valoration, id_project, id_heuristic, id_criteria) VALUES ($1, $2, $3, $4)";

                    client.query(
                        insertQuery,
                        [
                            datos.valoration,
                            datos.id_project,
                            datos.id_heuristic,
                            datos.id_criteria,
                        ],
                        (error, results) => {
                            if (error) {
                                console.error(
                                    "Error al insertar los datos:",
                                    error
                                );
                            } else {
                                console.log("Datos insertados correctamente.");
                            }
                        }
                    );
                }
            );
        }
    }
});

app.get("/api/evaluationresults/:idProject", async (req, res) => {
    const idProject = req.params.idProject;

    // Consulta para obtener la URL del proyecto
    const projectQuery = "SELECT url FROM projects WHERE id = $1";

    client.query(projectQuery, [idProject], (projectError, projectResults) => {
        if (projectError) {
            console.error(
                "Error al obtener la URL del proyecto:",
                projectError
            );
            res.status(500).json({
                error: "Error al obtener los datos del proyecto",
            });
            return;
        }

        if (projectResults.rows.length === 0) {
            res.status(404).json({ error: "Proyecto no encontrado" });
            return;
        }

        const projectUrl = projectResults.rows[0].url;

        // Consulta para obtener los resultados de las evaluaciones
        const evaluationQuery = `
            SELECT e.*, c.description
            FROM evaluation e
            INNER JOIN projects p ON e.id_project = p.id
            INNER JOIN criteria c ON e.id_criteria = c.id
            WHERE p.url = $1
        `;

        client.query(
            evaluationQuery,
            [projectUrl],
            (evaluationError, evaluationResults) => {
                if (evaluationError) {
                    console.error(
                        "Error al obtener los datos de evaluación:",
                        evaluationError
                    );
                    res.status(500).json({
                        error: "Error al obtener los datos de evaluación",
                    });
                    return;
                }

                res.json(evaluationResults.rows);
            }
        );
    });
});

app.get("/api/informationprojects/:idProject", async (req, res) => {
    const idProject = req.params.idProject;

    // Consulta para obtener la URL del proyecto
    const projectQuery = "SELECT url FROM projects WHERE id = $1";

    client.query(projectQuery, [idProject], (projectError, projectResults) => {
        if (projectError) {
            console.error(
                "Error al obtener la URL del proyecto:",
                projectError
            );
            res.status(500).json({
                error: "Error al obtener los datos del proyecto",
            });
            return;
        }

        if (projectResults.rows.length === 0) {
            res.status(404).json({ error: "Proyecto no encontrado" });
            return;
        }

        const projectUrl = projectResults.rows[0].url;

        // Consulta para obtener los resultados de las evaluaciones
        const evaluationQuery = `
            WITH ranked_projects AS (
                SELECT 
                    p.description,
                    p.url,
                    u_coordinator.name AS coordinator_name,
                    string_agg(u_evaluator.name, ', ') AS evaluators,
                    ROW_NUMBER() OVER (PARTITION BY p.url ORDER BY LENGTH(p.description) DESC) AS rn
                FROM 
                    projects p
                JOIN 
                    users u_coordinator ON p.id_coordinator = u_coordinator.id
                JOIN (
                    SELECT 
                        u.id,
                        u.name
                    FROM 
                        users u
                    JOIN (
                        SELECT 
                            unnest(string_to_array(p.id_evaluator::text, ' '))::int AS id
                        FROM 
                            projects p
                        WHERE 
                            p.url = $1
                    ) e ON u.id = e.id
                ) u_evaluator ON true
                GROUP BY
                    p.description,
                    p.url,
                    u_coordinator.name
            )
            SELECT 
                description,
                url,
                coordinator_name,
                evaluators
            FROM 
                ranked_projects
            WHERE 
                url = $1
                AND rn = 1;
        `;

        client.query(
            evaluationQuery,
            [projectUrl],
            (evaluationError, evaluationResults) => {
                if (evaluationError) {
                    console.error(
                        "Error al obtener los datos del proyecto:",
                        evaluationError
                    );
                    res.status(500).json({
                        error: "Error al obtener los datos del proyecto",
                    });
                    return;
                }

                res.json(evaluationResults.rows);
            }
        );
    });
});

const port = process.env.PORT ?? 8080;

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
