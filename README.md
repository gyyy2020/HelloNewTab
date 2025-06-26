# Firefox New Tab Extension

A simple Firefox extension that replaces the new tab page with a centered search box.

## Features

- Clean, minimalist design
- Centered search box
- Google search integration
- Automatic focus on the search box when opening a new tab
- Smooth animations and modern styling
- [ ] shortcut have fixed height
- [ ] online wallpaper service, user can change and download it.
- [ ] online motto service

## Installation

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select the `manifest.json` file

## Development

The extension consists of the following files:

- `manifest.json`: Extension configuration
- `newtab.html`: The main HTML page that replaces the new tab
- `styles.css`: Styling for the new tab page
- `newtab.js`: JavaScript functionality

To modify the extension, edit these files and reload the extension in `about:debugging`.
