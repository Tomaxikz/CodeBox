import { AuthController } from "../Controllers/Auth/AuthController";
import { Router } from "./type";

export function authRouter() {
    Router.group("/auth", () => {
        Router.get("/user", AuthController.user)
        Router.post("/login", AuthController.login);
        Router.post("/register", AuthController.Register)

        Router.group("/checkpoint", () => {
            Router.post("/forgot-password", AuthController.ForgotPasword)
            Router.put("/reset-password/:token", AuthController.ResetPasswrod)
        })
    })
}