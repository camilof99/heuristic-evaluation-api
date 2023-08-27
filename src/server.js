const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "heuristic_evaluation_bd",
});

connection.connect((error) => {
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
            "SELECT email, password FROM users WHERE email = ? AND password = ?";

        connection.query(query_sql, [email, password], (error, results) => {
            if (error) {
                console.error("Error en la consulta: ", error);
                res.status(500).send("Error interno del servidor.");
            } else if (results.length === 0) {
                res.status(401).send("Credenciales inválidas.");
            } else {
                const user = results[0];
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
    const query = "SELECT * FROM projects";

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
    });
});

app.get("/api/projects/:id", async (req, res) => {
    const projectId = req.params.id;
    const query = "SELECT * FROM projects WHERE id = ?";

    connection.query(query, [projectId], (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
    });
});

app.post("/api/createProject", async (req, res) => {
    const projectInfo = req.body;
    console.log(projectInfo);
    
    const query = "INSERT INTO projects SET ?";

    connection.query(query, [projectInfo], (error, results) => {
        if (error) {
            console.error("Error al insertar los datos de la tabla:", error);
            res.status(500).json({ error: "Error al insertar los datos" });
            return;
        }

        res.json(results);
    });
});

app.get("/api/coordinators", async (req, res) => {
    const query = "SELECT * FROM users where rol = 'coordinator'";

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
    });
});

app.get("/api/evaluators", async (req, res) => {
    const query = "SELECT * FROM users where rol = 'evaluator'";

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
    });
});

app.get("/api/heuristics", async (req, res) => {
    const projectId = req.params.id;
    const query =
        "SELECT c.*, (h.description) heuristic FROM criteria c, heuristics h WHERE c.id_heuristic = h.id;";

    connection.query(query, [projectId], (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
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

            const selectQuery =
                "SELECT * FROM evaluation WHERE id_project = ? AND id_heuristic = ? AND id_criteria = ?";

            const query = "INSERT INTO evaluation SET ?";

            connection.query(
                selectQuery,
                [
                    datos.id_project,
                    datos.id_heuristic,
                    datos.id_criteria,
                ],
                (error, results) => {
                    if (error) {
                        console.error(
                            "Error al verificar los |datos existentes:",
                            error
                        );
                        return;
                    }

                    if (results.length > 0) {
                        console.log(
                            "Ya existe un registro con los mismos valores."
                        );
                        return;
                    }

                    const insertQuery = "INSERT INTO evaluation SET ?";
                    connection.query(insertQuery, datos, (error, results) => {
                        if (error) {
                            console.error(
                                "Error al insertar los datos:",
                                error
                            );
                        } else {
                            console.log("Datos insertados correctamente.");
                        }
                    });
                }
            );
        }
    }
});

app.get("/api/evaluationresults/:idProject", async (req, res) => {
    const idProject = req.params.idProject;
    const query = "SELECT * FROM evaluation WHERE id_project = ?";

    connection.query(query, [idProject], (error, results) => {
        if (error) {
            console.error("Error al obtener los datos de la tabla:", error);
            res.status(500).json({ error: "Error al obtener los datos" });
            return;
        }

        res.json(results);
    });
});

app.listen(3000, () => {
    console.log("Servidor corriendo en el puerto 3000");
});
