---
sidebar_position: 1
---

# Architecture Overview

DocMan is a MERN-style application with two frontend surfaces:

- `frontend`: legacy React/Vite interface
- `frontend-vue`: Vue/Vuetify migration interface

The backend is an Express API using MongoDB through Mongoose.

Production deployments use the backend to serve the selected static frontend bundle.

```mermaid
flowchart LR
  Browser --> Origin
  Origin --> Express[Express Backend]
  Express --> Atlas[(MongoDB Atlas)]
  Express --> Static[Selected Frontend Dist]
```
