"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    usersPath = path.join(process.cwd(), 'data', 'users.json');
    async readUsers() {
        try {
            const data = await fs.readFile(this.usersPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    async writeUsers(users) {
        const dir = path.dirname(this.usersPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.usersPath, JSON.stringify(users, null, 2));
    }
    async register(username, password) {
        const users = await this.readUsers();
        if (users.find(u => u.username === username)) {
            return { success: false, error: 'Username already exists' };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({
            id: Date.now().toString(),
            username,
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString()
        });
        await this.writeUsers(users);
        return { success: true };
    }
    async login(username, password) {
        const users = await this.readUsers();
        const user = users.find(u => u.username === username);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return { success: false, error: 'Invalid password' };
        }
        const { passwordHash, ...safeUser } = user;
        return { success: true, user: safeUser };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map