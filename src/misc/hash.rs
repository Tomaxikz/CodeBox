use anyhow::{Result, anyhow};
use argon2::{
    password_hash::{
        PasswordHash,
        PasswordHasher,
        PasswordVerifier,
        SaltString,
    },
    Algorithm,
    Argon2,
    Params,
    Version,
};
use rand::RngCore;


pub fn hash_password(password: &str, app_key: &str) -> Result<String> {
    let salt = generate_salt();

    let argon2 = Argon2::new_with_secret(
        app_key.as_bytes(),
        Algorithm::Argon2id,
        Version::V0x13,
        Params::default(),
    )
    .map_err(|err| {
        tracing::error!("failed to create password hasher: {err:?}");
        anyhow!("failed to create password hasher")
    })?;

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|err| {
            tracing::error!("failed to hash password: {err:?}");
            anyhow!("failed to hash password")
        })?
        .to_string();

    Ok(password_hash)
}

pub fn verify_password(password: &str, password_hash: &str, app_key: &str) -> Result<bool> {
    let parsed_hash = PasswordHash::new(password_hash).map_err(|err| {
        tracing::warn!("failed to parse password hash: {err:?}");
        anyhow!("invalid password hash")
    })?;

    let argon2 = Argon2::new_with_secret(
        app_key.as_bytes(),
        Algorithm::Argon2id,
        Version::V0x13,
        Params::default(),
    )
    .map_err(|err| {
        tracing::error!("failed to create password hasher: {err:?}");
        anyhow!("failed to create password hasher")
    })?;

    Ok(argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

fn generate_salt() -> SaltString {
    let mut bytes = [0_u8; 16];
    rand::rng().fill_bytes(&mut bytes);

    SaltString::encode_b64(&bytes).expect("generated salt should be valid")
}
