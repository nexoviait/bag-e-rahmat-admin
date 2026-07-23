<?php

namespace App\Providers;

use App\Models\Budget;
use App\Models\Expense;
use App\Models\OwnerPayment;
use App\Models\Project;
use App\Models\Revenue;
use App\Models\ShareholderInvestment;
use App\Policies\BudgetPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\OwnerPaymentPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\RevenuePolicy;
use App\Policies\ShareholderInvestmentPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Budget::class, BudgetPolicy::class);
        Gate::policy(Revenue::class, RevenuePolicy::class);
        Gate::policy(Expense::class, ExpensePolicy::class);
        Gate::policy(ShareholderInvestment::class, ShareholderInvestmentPolicy::class);
        Gate::policy(OwnerPayment::class, OwnerPaymentPolicy::class);

        // Login: 5 attempts/min per IP+email pair, to blunt credential brute-forcing.
        RateLimiter::for('auth', function ($request) {
            return Limit::perMinute(5)->by($request->ip().'|'.strtolower((string) $request->input('email')));
        });

        // General authenticated API traffic: 60 requests/min per user (or per IP if unauthenticated).
        RateLimiter::for('api', function ($request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
