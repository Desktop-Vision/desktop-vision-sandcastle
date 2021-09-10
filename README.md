# Desktop Vision Sand Castle

## Quick Start

1. npm install
2. npm run start
3. open http://localhost:3000
4. set up the example app from https://github.com/Desktop-Vision/desktop-vision-example-app - this needs to be running for api requests

## How to connect to Desktop Vision

1. Create an account at https://desktop.vision
2. Download the streamer app and sign in
3. Confirm the streamer app is connected and listed at https://desktop.vision/app

## How to use Desktop Vision in example app / oauth

1. Have the user sign in to Desktop Vision, after sign in, the user will redirect back with a single use oauth code.
2. Use the oauth code to fetch an access token for the user.
3. Use the access token to fetch the user computers.
4. Connect to a user computer with the access token & computer channel name.
5. Listen for the ComputerConnection event "stream-added" for a video stream.

## Development & Building
- npm start will launch the dev server and open the sample scene.
- npm run build will process and build your project into a dist folder.
- npm run build-xrpk will npm build, then create an XR Package in dist. (Note that this script runs an interactive CLI for details about the various aspects of your XR Package.)
- npm run dev-xrpk will do the same but output an unminified, source-mapped XR Package to help you debug your XR Package in your runtime of choice (we recommend Chimera). Please note the resulting .wbn file size will be very large - don't use this in production!