mod routes;
mod bootstrap;
mod drivers;
mod misc;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    tracing_subscriber::fmt()
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .init();

    if let Err(err) = bootstrap::init::init().await {
        tracing::error!("boot failed: {err}");
    }
}