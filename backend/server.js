import express from "express";

const app = express();

app.get("/api/docs", (req, res) => {
    res.send("List of documents");
});

app.listen(5001, () => {
    console.log("Server is running on port 5001");
});