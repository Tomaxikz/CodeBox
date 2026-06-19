use axum::{Router, routing::{post}};

use crate::{app::controllers::api::http::auth::register_controller::register, routes::SharedState};

pub fn router() -> Router<SharedState> {
    Router::new().route("/health", post(register))
}