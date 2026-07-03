<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});



Route::get('/admin/{any?}', function () {
    return view('admin');
})->where('any', '.*');

Route::get('/staff2/{any?}', function () {
    return view('staff2');
})->where('any', '.*');

Route::get('/staff1/{any?}', function () {
    return view('staff1');
})->where('any', '.*');

Route::get('/download/responder-app', function () {
    $file = public_path('ResponderApp_Release.apk');
    if (file_exists($file)) {
        $headers = [
            'Content-Type' => 'application/vnd.android.package-archive',
        ];
        return response()->download($file, 'MDRRMO_Responder_App.apk', $headers);
    }
    abort(404, 'The Responder App APK is not currently available for download.');
})->name('download.responder-app');

