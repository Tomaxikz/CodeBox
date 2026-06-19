use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::{misc::{hash::hash_password, http_errors::{HttpError, HttpResult}}, routes::SharedState};

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,

    #[validate(length(min = 3, max = 32))]
    pub username: String,

    #[validate(length(min = 8))]
    pub password: String,

    #[validate(length(min = 1))]
    pub first_name: String,

    #[validate(length(min = 1))]
    pub last_name: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub id: i64,
    pub email: String,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
}

impl RegisterRequest {
    pub fn validate_request(&self) -> HttpResult<()> {
        self.validate().map_err(|err| {
            tracing::warn!("Register validation failed: {err}");
            HttpError::BadRequest("Invalid registration data".to_string())
        })
    }
}

pub async fn register(
    State(state): State<SharedState>,
    Json(payload): Json<RegisterRequest>
) -> HttpResult<Json<RegisterResponse>> {
    payload.validate_request()?;

    let app_key = std::env::var("APP_KEY")
        .map_err(|_| HttpError::Internal("APP_KEY must be configured".to_string()))?;

    let password_hash = hash_password(&payload.password, &app_key)
        .map_err(|_| HttpError::Internal("Failed to hash password".to_string()))?;


    let user = sqlx::query_as!(
        RegisterResponse,
        r#"
        INSERT INTO users (email, username, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, username, first_name, last_name
        "#,
        payload.email,
        payload.username,
        password_hash,
        payload.first_name,
        payload.last_name,
    )
    .fetch_one(&state.db)
    .await
    .map_err(|err| {
        tracing::error!("Failed to create user: {err}");
        HttpError::Internal("Failed to create user".to_string())
    })?;

    Ok(Json(user))
}