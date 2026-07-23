<?php

namespace App\Models;

use App\Traits\LogsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use LogsAuditable, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'status',
        'start_date',
        'end_date',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user')
            ->withPivot('assigned_by')
            ->withTimestamps();
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function shareholderInvestments(): HasMany
    {
        return $this->hasMany(ShareholderInvestment::class);
    }

    public function ownerPayments(): HasMany
    {
        return $this->hasMany(OwnerPayment::class);
    }

    /**
     * Single source of truth for the spec's financial formulas, shared between the
     * per-record accessors below (live sums) and list-view withSum aggregates
     * (ProjectController@index) so the arithmetic is never duplicated.
     */
    public static function computeFormulas(array $sums): array
    {
        $budget = (float) ($sums['budget'] ?? 0);
        $revenue = (float) ($sums['revenue'] ?? 0);
        $shareholderInvestment = (float) ($sums['shareholder_investment'] ?? 0);
        $expenses = (float) ($sums['expenses'] ?? 0);
        $ownerPayments = (float) ($sums['owner_payments'] ?? 0);

        $totalMoney = $budget + $revenue + $shareholderInvestment;
        $deductMoney = $expenses + $ownerPayments;

        return [
            'total_money' => $totalMoney,
            'deduct_money' => $deductMoney,
            'remaining' => $totalMoney - $deductMoney,
            'profit' => $revenue - $expenses,
        ];
    }

    public function getTotalBudgetAttribute(): float
    {
        return (float) $this->budgets()->sum('amount');
    }

    public function getTotalRevenueAttribute(): float
    {
        return (float) $this->revenues()->sum('amount');
    }

    public function getTotalShareholderInvestmentAttribute(): float
    {
        return (float) $this->shareholderInvestments()->sum('amount');
    }

    public function getTotalExpensesAttribute(): float
    {
        return (float) $this->expenses()->sum('amount');
    }

    public function getTotalOwnerPaymentsAttribute(): float
    {
        return (float) $this->ownerPayments()->sum('amount');
    }

    protected function formulaSums(): array
    {
        return [
            'budget' => $this->total_budget,
            'revenue' => $this->total_revenue,
            'shareholder_investment' => $this->total_shareholder_investment,
            'expenses' => $this->total_expenses,
            'owner_payments' => $this->total_owner_payments,
        ];
    }

    public function getTotalMoneyAttribute(): float
    {
        return static::computeFormulas($this->formulaSums())['total_money'];
    }

    public function getDeductMoneyAttribute(): float
    {
        return static::computeFormulas($this->formulaSums())['deduct_money'];
    }

    public function getRemainingAttribute(): float
    {
        return static::computeFormulas($this->formulaSums())['remaining'];
    }

    public function getProfitAttribute(): float
    {
        return static::computeFormulas($this->formulaSums())['profit'];
    }
}
