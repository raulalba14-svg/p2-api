// server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const app = Fastify({ logger: true });

// CORS: permite el front local y TU dominio de Vercel
await app.register(cors, {
  origin: [
    "http://localhost:5173",
    "https://app-nu-murex.vercel.app", // <-- tu URL de Vercel
  ],
});

// Swagger (documentación)
await app.register(swagger, {
  openapi: { info: { title: "Tareas API", version: "1.0.0" } },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

// ---- "BD" temporal en memoria (pronto la pasamos a Postgres) ----
let idSeq = 3;
const tareas = [
  { id: 1, titulo: "Primera", hecho: false },
  { id: 2, titulo: "Segunda", hecho: true },
];

const tareaSchema = z.object({
  titulo: z.string().min(1, "Título requerido"),
  hecho: z.boolean().optional().default(false),
});

// Rutas
app.get("/health", async () => ({ ok: true }));

app.get("/tareas", async (_req, reply) => reply.send(tareas));

app.get("/tareas/:id", async (req, reply) => {
  const id = Number(req.params.id);
  const t = tareas.find((x) => x.id === id);
  if (!t) return reply.code(404).send({ error: "No existe" });
  return t;
});

app.post("/tareas", async (req, reply) => {
  const parse = tareaSchema.safeParse(req.body);
  if (!parse.success) return reply.code(400).send(parse.error.flatten());
  const nueva = { id: idSeq++, ...parse.data };
  tareas.push(nueva);
  reply.code(201).send(nueva);
});

app.patch("/tareas/:id", async (req, reply) => {
  const id = Number(req.params.id);
  const idx = tareas.findIndex((x) => x.id === id);
  if (idx === -1) return reply.code(404).send({ error: "No existe" });
  const parcial = z.object({
    titulo: z.string().min(1).optional(),
    hecho: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parcial.success) return reply.code(400).send(parcial.error.flatten());
  tareas[idx] = { ...tareas[idx], ...parcial.data };
  reply.send(tareas[idx]);
});

app.delete("/tareas/:id", async (req, reply) => {
  const id = Number(req.params.id);
  const idx = tareas.findIndex((x) => x.id === id);
  if (idx === -1) return reply.code(404).send({ error: "No existe" });
  const [borrada] = tareas.splice(idx, 1);
  reply.send(borrada);
});

// Arranque (PORT para Render; 3000 en local)
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`API en http://localhost:${port}`);
  app.log.info(`Docs en http://localhost:${port}/docs`);
});
