use axum::{Router, routing::{post}};

use crate::{app::controllers::api::http::auth::{login_controller::{login}, register_controller::register}, routes::SharedState};

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/health", post(register))
        .route("/login", post(login))
}
