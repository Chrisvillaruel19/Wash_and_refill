import app from "@/app.js";
import { ENV } from "@/config/env.js";

const startserver = () => {
    try{
    app.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT}`);
        console.log(`Backend URL: ${ENV.BACKEND_PORT}`);
    });
}catch (error) {
        console.error("Could not start server:", error);
        process.exit(1);
    }
};

startserver();
