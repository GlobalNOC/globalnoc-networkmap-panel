## Development

### Node.js 6.x to 11.15
This project was originally conceived with Node v6.xx.x and npm v3.10.10.

 * Clone this repository
    ```git clone repo_url```
 * Go to the cloned location and run 
    `npm install` to install dependencies
 * Install gulp globally
    `npm install gulp -g`
 * Build the plugin
    `npm run build` or `gulp` should create a `dist` folder that contains the transpiled code for the browser
  * Make sure to build the plugin whenever there's a code change

### Node.js >11.15
When using Node.js >11.15, these commands might work already.
```
# Install dependencies.
npx yarn install

# Run build.
npx yarn build
```

When Yarn is not installed (YMMV), this command might help:
```
# Install yarn globally.
npm install yarn -g
```
