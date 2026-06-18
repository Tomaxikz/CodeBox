pub mod auth;

use std::sync::Arc;
use axum::Router;
use crate::bootstrap::init::AppState;

pub type SharedState = Arc<AppState>;

pub fn router() -> Router<SharedState> {
    Router::new().nest("/api", auth::router())
        
}