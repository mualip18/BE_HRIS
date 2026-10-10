import "dotenv/config";

import app from "./app";
import db from "./config/db";
import employeeService from "./modules/hris/services/employee.service";

// =====================================
// GOOGLE CLIENT ID
// =====================================
console.log("GOOGLE CLIENT ID:");
console.log(process.env.GOOGLE_CLIENT_ID);

// =====================================
// PORT
// =====================================
const PORT = Number(process.env.PORT) || 3000;

// =====================================
// DATABASE
// =====================================
db.connect()
  .then(async () => {
    console.log("Database connected ✅");

    // =====================================
    // HRIS - INITIALIZE EMPLOYEE TABLE
    // =====================================
    try {
      await employeeService.initialize();

      console.log(
        "HRIS employee table initialized ✅"
      );
    } catch (error) {
      console.error(
        "HRIS employee table initialization failed ❌",
        error
      );

      process.exit(1);
    }

    // =====================================
    // START SERVER
    // =====================================
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("DB Error ❌", err);
    process.exit(1);
  });