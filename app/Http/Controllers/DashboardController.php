<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const LEDGER_TABLES = [
        'budget' => 'budgets',
        'revenue' => 'revenues',
        'expenses' => 'expenses',
        'shareholder_investment' => 'shareholder_investments',
        'owner_payments' => 'owner_payments',
    ];

    /**
     * Centralized Dashboard — cross-project rollup, Super Admin/Admin only.
     */
    public function index()
    {
        $orgSums = [
            'budget' => (float) DB::table('budgets')->sum('amount'),
            'revenue' => (float) DB::table('revenues')->sum('amount'),
            'shareholder_investment' => (float) DB::table('shareholder_investments')->sum('amount'),
            'expenses' => (float) DB::table('expenses')->sum('amount'),
            'owner_payments' => (float) DB::table('owner_payments')->sum('amount'),
        ];

        $projectCountsByStatus = Project::select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $projects = Project::withSum('budgets as budget_sum', 'amount')
            ->withSum('revenues as revenue_sum', 'amount')
            ->withSum('expenses as expenses_sum', 'amount')
            ->withSum('shareholderInvestments as shareholder_investment_sum', 'amount')
            ->withSum('ownerPayments as owner_payments_sum', 'amount')
            ->get()
            ->map(function ($project) {
                $sums = [
                    'budget' => $project->budget_sum ?? 0,
                    'revenue' => $project->revenue_sum ?? 0,
                    'shareholder_investment' => $project->shareholder_investment_sum ?? 0,
                    'expenses' => $project->expenses_sum ?? 0,
                    'owner_payments' => $project->owner_payments_sum ?? 0,
                ];
                $formulas = Project::computeFormulas($sums);

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'status' => $project->status,
                    'remaining' => $formulas['remaining'],
                    'profit' => $formulas['profit'],
                ];
            });

        return response()->json([
            'project_count' => $projects->count(),
            'projects_by_status' => $projectCountsByStatus,
            'totals' => $orgSums,
            'formulas' => Project::computeFormulas($orgSums),
            'top_by_remaining' => $projects->sortByDesc('remaining')->take(5)->values(),
            'top_by_profit' => $projects->sortByDesc('profit')->take(5)->values(),
            'monthly_trend' => $this->orgMonthlySeries(),
        ]);
    }

    private function orgMonthlySeries(): array
    {
        $end = Carbon::now()->endOfMonth();
        $start = $end->copy()->subMonths(11)->startOfMonth();

        $months = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $months[$cursor->format('Y-m')] = [
                'month' => $cursor->format('Y-m'),
                'budget' => 0.0,
                'revenue' => 0.0,
                'expenses' => 0.0,
                'shareholder_investment' => 0.0,
                'owner_payments' => 0.0,
            ];
            $cursor->addMonth();
        }

        $driver = DB::connection()->getDriverName();
        $monthExpr = $driver === 'sqlite' ? "strftime('%Y-%m', entry_date)" : "DATE_FORMAT(entry_date, '%Y-%m')";

        foreach (self::LEDGER_TABLES as $key => $table) {
            $rows = DB::table($table)
                ->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])
                ->selectRaw("{$monthExpr} as month, SUM(amount) as total")
                ->groupBy('month')
                ->pluck('total', 'month');

            foreach ($rows as $month => $total) {
                if (isset($months[$month])) {
                    $months[$month][$key] = (float) $total;
                }
            }
        }

        foreach ($months as &$row) {
            $row['profit'] = $row['revenue'] - $row['expenses'];
        }

        return array_values($months);
    }
}
