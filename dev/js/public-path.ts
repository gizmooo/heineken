const src = document.querySelector("[src*='app']")?.getAttribute('src')!;
__webpack_public_path__ = src.substr(0, src.lastIndexOf('/') + 1);