use axum::{Router, routing::post};

use crate::app::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/register", post(register))
}

async fn login() -> &'static str {
    "login"
}

async fn register() -> &'static str {
    "register"
}