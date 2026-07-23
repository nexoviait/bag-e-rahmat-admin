<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;

class AuditLogController extends Controller
{
    public function index()
    {
        return response()->json(
            AuditLog::with('user')->orderBy('created_at', 'desc')->take(100)->get()
        );
    }
}
