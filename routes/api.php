<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\OwnerPaymentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ShareholderInvestmentController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public login (Sanctum Token based with rate limiting)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// Protected routes
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::get('/projects/{project}/dashboard', [ProjectController::class, 'dashboard']);
    Route::post('/projects/{project}/assign', [ProjectController::class, 'assignUsers']);
    Route::delete('/projects/{project}/assign/{user}', [ProjectController::class, 'unassignUser']);

    // Budget (per project)
    Route::get('/projects/{project}/budget', [BudgetController::class, 'index']);
    Route::post('/projects/{project}/budget', [BudgetController::class, 'store']);
    Route::put('/projects/{project}/budget/{entry}', [BudgetController::class, 'update']);
    Route::delete('/projects/{project}/budget/{entry}', [BudgetController::class, 'destroy']);

    // Revenue (per project)
    Route::get('/projects/{project}/revenue', [RevenueController::class, 'index']);
    Route::post('/projects/{project}/revenue', [RevenueController::class, 'store']);
    Route::put('/projects/{project}/revenue/{entry}', [RevenueController::class, 'update']);
    Route::delete('/projects/{project}/revenue/{entry}', [RevenueController::class, 'destroy']);

    // Expenses (per project)
    Route::get('/projects/{project}/expenses', [ExpenseController::class, 'index']);
    Route::post('/projects/{project}/expenses', [ExpenseController::class, 'store']);
    Route::put('/projects/{project}/expenses/{entry}', [ExpenseController::class, 'update']);
    Route::delete('/projects/{project}/expenses/{entry}', [ExpenseController::class, 'destroy']);

    // Shareholder investments (per project)
    Route::get('/projects/{project}/shareholders', [ShareholderInvestmentController::class, 'index']);
    Route::post('/projects/{project}/shareholders', [ShareholderInvestmentController::class, 'store']);
    Route::put('/projects/{project}/shareholders/{entry}', [ShareholderInvestmentController::class, 'update']);
    Route::delete('/projects/{project}/shareholders/{entry}', [ShareholderInvestmentController::class, 'destroy']);

    // Owner payments (per project)
    Route::get('/projects/{project}/owner-payments', [OwnerPaymentController::class, 'index']);
    Route::post('/projects/{project}/owner-payments', [OwnerPaymentController::class, 'store']);
    Route::put('/projects/{project}/owner-payments/{entry}', [OwnerPaymentController::class, 'update']);
    Route::delete('/projects/{project}/owner-payments/{entry}', [OwnerPaymentController::class, 'destroy']);

    // Per-project report
    Route::get('/projects/{project}/reports', [ReportController::class, 'show']);

    // Centralized (Super Admin / Admin only)
    Route::middleware('role:Super Admin|Admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/reports/overview', [ReportController::class, 'overview']);

        Route::get('/permissions', [RoleController::class, 'getPermissions']);
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::put('/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::middleware('role_or_permission:Super Admin|Admin|manage_settings')->group(function () {
        Route::post('/settings', [SettingController::class, 'update']);
        Route::post('/settings/logo', [SettingController::class, 'uploadLogo']);
        Route::delete('/settings/logo', [SettingController::class, 'removeLogo']);
        Route::post('/settings/favicon', [SettingController::class, 'uploadFavicon']);
        Route::delete('/settings/favicon', [SettingController::class, 'removeFavicon']);
    });

    // Audit trail
    Route::middleware('role_or_permission:Super Admin|Admin|view_audit_logs')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });
});
