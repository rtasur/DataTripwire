import './config/env.js';
import app from './app.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`DataTripwire API listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
});