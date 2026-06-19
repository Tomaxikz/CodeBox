use std::env;

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use validator::{Validate, ValidateEmail, ValidationError};

use crate::{misc::{hash::{hash_password, verify_password}, http_errors::{HttpError, HttpResult}}, routes::SharedState};

#[derive(Debug, Deserialize, Validate)]
struct LoginRequest {
    #[validate(custom(function = "validate_login"))]
    login: Login,

    #[validate(length(min = 8))]
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginResponse {
    id: i64,
    email: String,
    username: String,
    first_name: String,
    last_name: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum Login {
    Email { email: String },
    Username { username: String },
}

struct LoginUser {
    id: i64,
    email: String,
    username: String,
    first_name: String,
    last_name: String,
    password_hash: String,
}

fn validate_login(login: &Login) -> Result<(), ValidationError> {
    match login {
        Login::Email { email } => {
            if email.validate_email() {
                Ok(())
            } else {
                Err(ValidationError::new("invalid_email"))
            }
        }
        Login::Username { username } => {
            if username.len() >= 3 && username.len() <= 32 {
                Ok(())
            } else {
                Err(ValidationError::new("invalid_username"))
            }
        }
    }
}

impl LoginRequest {
    pub fn validate_request(&self) -> HttpResult<()> {
        self.validate().map_err(|err| {
            tracing::warn!("Failed to validate login request {err}");
            HttpError::BadRequest("Invalid request body".to_string())
        })
    }
}

pub async fn login(
    State(state): State<SharedState>,
    Json(payload): Json<LoginRequest>
) -> HttpResult<Json<LoginResponse>> {

    payload.validate_request()?;

    let login_value = match &payload.login {
        Login::Email { email } => email,
        Login::Username { username } => username,
    };

    let user = sqlx::query_as!(
        LoginUser,
        r#"
        SELECT id, email, username, first_name, last_name, password_hash
        FROM users
        WHERE email = $1 OR username = $1
        "#,
        login_value
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|err| {
        tracing::error!("Failed to find login user: {err}");
        HttpError::Internal("Failed to login".to_string())
    })?;

    let Some(user) = user else {
        return  Err(HttpError::Unauthorized("Invalid credentials".to_string()));
    };

    let app_key = std::env::var("APP_KEY")
        .map_err(|_| HttpError::Internal("APP_KEY must be configured".to_string()))?;

    let valid_password = verify_password(&payload.password, &user.password_hash, &app_key)
        .map_err(|err| {
            tracing::error!("Failed to verify password: {err}");
            HttpError::Internal("Failed to login".to_string())
        })?;

    if !valid_password {
        return Err(HttpError::Unauthorized("Invalid credentials".to_string()));
    }

    let response = LoginResponse {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
    };

    Ok(Json(response))
}