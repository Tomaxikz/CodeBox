pub mod auth;

use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue, Method, header},
    middleware::{self, Next},
    response::Response,
    Router,
};
use tower_http::cors::CorsLayer;

use crate::{bootstrap::init::AppState, misc::csrf::csrf_guard};

pub type SharedState = Arc<AppState>;

pub fn router() -> Router<SharedState> {
    Router::new()
        .nest("/api/auth", api_router())
        .layer(middleware::from_fn(log_request))
}

async fn log_request(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let started_at = Instant::now();

    let response = next.run(req).await;
    let latency = started_at.elapsed();

    tracing::info!(
        status = response.status().as_u16(),
        latency_ms = latency.as_millis(),
        "{method} {path}"
    );

    response
}

fn api_router() -> Router<SharedState> {
    Router::new()
        .merge(auth::router())
        .route_layer(middleware::from_fn(csrf_guard))
        .layer(cors())
}

fn cors() -> CorsLayer {
    CorsLayer::new()
        .allow_origin([
            HeaderValue::from_static("http://localhost:5173"),
            HeaderValue::from_static("http://127.0.0.1:5173"),
            HeaderValue::from_static("https://yourdomain.com"),
        ])
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            HeaderName::from_static("x-csrf-token")
        ])
}
