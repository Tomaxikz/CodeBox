use axum::{
    extract::Request,
    http::{HeaderValue, Method, header},
    middleware::Next,
    response::Response,
};
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;
use std::env;

use crate::misc::http_errors::HttpError;

const CSRF_COOKIE_NAME: &str = "csrf";
const CSRF_HEADER_NAME: &str = "x-csrf-token";
type HmacSha256 = Hmac<Sha256>;

pub async fn csrf_guard(req: Request, next: Next) -> Result<Response, HttpError> {
    let app_key = env::var("APP_KEY")
        .map_err(|_| HttpError::Internal("APP_KEY must be configured".to_string()))?;

    let csrf_cookie = req
        .headers()
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .and_then(|cookies| read_cookie(cookies, CSRF_COOKIE_NAME))
        .map(str::to_string);

    if is_safe_method(req.method()) {
        let should_set_cookie = csrf_cookie
            .as_deref()
            .map(|token| !verify_csrf_token(token, &app_key))
            .unwrap_or(true);
        let mut response = next.run(req).await;

        if should_set_cookie {
            set_csrf_cookie(&mut response, &app_key)?;
        }

        return Ok(response);
    }

    let csrf_header = req
        .headers()
        .get(CSRF_HEADER_NAME)
        .and_then(|value| value.to_str().ok());

    match (csrf_header, csrf_cookie.as_deref()) {
        (Some(header), Some(cookie)) if header == cookie && verify_csrf_token(cookie, &app_key) => {
            let mut response = next.run(req).await;
            set_csrf_cookie(&mut response, &app_key)?;
            Ok(response)
        }
        _ => Err(HttpError::Forbidden("Invalid CSRF token".to_string())),
    }
}

fn is_safe_method(method: &Method) -> bool {
    matches!(*method, Method::GET | Method::HEAD | Method::OPTIONS)
}

fn set_csrf_cookie(response: &mut Response, app_key: &str) -> Result<(), HttpError> {
    let token = generate_csrf_token(app_key)?;
    let cookie = format!(
        "{CSRF_COOKIE_NAME}={token}; Path=/; SameSite=Lax"
    );

    let cookie = HeaderValue::from_str(&cookie)
        .map_err(|_| HttpError::Internal("Failed to create CSRF cookie".to_string()))?;

    response.headers_mut().append(header::SET_COOKIE, cookie);

    Ok(())
}

fn generate_csrf_token(app_key: &str) -> Result<String, HttpError> {
    let mut bytes = [0_u8; 32];
    rand::rng().fill_bytes(&mut bytes);

    let nonce = encode_hex(&bytes);
    let signature = sign_nonce(&nonce, app_key)?;

    Ok(format!("{nonce}.{signature}"))
}

fn verify_csrf_token(token: &str, app_key: &str) -> bool {
    let Some((nonce, signature)) = token.split_once('.') else {
        return false;
    };

    let Ok(signature) = decode_hex(signature) else {
        return false;
    };

    let Ok(mut mac) = HmacSha256::new_from_slice(app_key.as_bytes()) else {
        return false;
    };

    mac.update(nonce.as_bytes());
    mac.verify_slice(&signature).is_ok()
}

fn sign_nonce(nonce: &str, app_key: &str) -> Result<String, HttpError> {
    let mut mac = HmacSha256::new_from_slice(app_key.as_bytes())
        .map_err(|_| HttpError::Internal("Failed to sign CSRF token".to_string()))?;

    mac.update(nonce.as_bytes());

    Ok(encode_hex(&mac.finalize().into_bytes()))
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn decode_hex(value: &str) -> Result<Vec<u8>, ()> {
    if value.len() % 2 != 0 {
        return Err(());
    }

    (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16).map_err(|_| ()))
        .collect()
}

fn read_cookie<'a>(cookies: &'a str, name: &str) -> Option<&'a str> {
    cookies
        .split(';')
        .map(str::trim)
        .find_map(|cookie| {
            let (cookie_name, cookie_value) = cookie.split_once('=')?;

            if cookie_name == name {
                Some(cookie_value)
            } else {
                None
            }
        })
}
