# FH5 Car List

A desktop application to manage your car list in Forza Horizon 5.

## Features

*   View and search your car list.
*   Sort by year, model, type, and owned status.
*   Add, edit, and update car information.
*   Mark cars as owned.
*   Data is stored locally in `cars.json`.

## How to Run (Development)

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the application:
    ```bash
    npm start
    ```

## How to Build (Production)

1.  Build the application for Windows:
    ```bash
    npm run dist
    ```
2.  The installer (`FH5 Car List Setup 1.0.0.exe`) will be created in the `dist` folder.
