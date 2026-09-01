use std::net::SocketAddr;

use crate::app::state::AppState;
use anyhow::Context;
use axum::Router;
use tokio::net::TcpListener;

mod app;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let state = AppState::initialize().await?;
    let app = app::router::router().with_state(state);

    let address = SocketAddr::from(([0, 0, 0, 0], 3000));

    let listener = TcpListener::bind(address)
        .await
        .with_context(|| format!("failed to bind server to {address}"))?;

    tracing::info!("server listening on http://{address}");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    tracing::info!("server stopped");

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install CTRL-C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("CTRL-C received");
        }
        _ = terminate => {
            tracing::info!("SIGTERM received");
        }
    }
}
