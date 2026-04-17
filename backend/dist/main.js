"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_session_1 = __importDefault(require("express-session"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_session_1.default)({
        secret: 'your-secret-key-change-this-to-something-secure',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false,
        }
    }));
    app.enableCors({
        origin: 'http://localhost:3000',
        credentials: true
    });
    await app.listen(3001);
    console.log('Backend running on http://localhost:3001');
}
bootstrap();
//# sourceMappingURL=main.js.map