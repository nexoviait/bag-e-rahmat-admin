<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: everything else is handled client-side by React Router.
Route::fallback(function () {
    return view('app');
});
