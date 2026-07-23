<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private const LEDGER_TABLES = [
        'budget' => 'budgets',
        'revenue' => 'revenues',
        'expenses' => 'expenses',
        'shareholder_investment' => 'shareholder_investments',
        'owner_payments' => 'owner_payments',
    ];

    /**
     * Per-project report: totals for the range + a monthly breakdown for charting.
     */
    public function show(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        [$start, $end] = $this->resolveRange($request);

        $totals = [];
        foreach (self::LEDGER_TABLES as $key => $table) {
            $totals[$key] = (float) DB::table($table)
                ->where('project_id', $project->id)
                ->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])
                ->sum('amount');
        }

        return response()->json([
            'meta' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
            'totals' => $totals,
            'formulas' => Project::computeFormulas($totals),
            'monthly' => $this->monthlySeries($start, $end, ['project_id' => $project->id]),
        ]);
    }

    /**
     * Cross-project report: org-wide totals + a per-project comparison table.
     * Super Admin/Admin only (enforced by route middleware, not a policy).
     */
    public function overview(Request $request)
    {
        [$start, $end] = $this->resolveRange($request);

        $totals = [];
        foreach (self::LEDGER_TABLES as $key => $table) {
            $totals[$key] = (float) DB::table($table)
                ->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])
                ->sum('amount');
        }

        $projects = Project::query()
            ->get()
            ->map(function ($project) use ($start, $end) {
                $sums = [];
                foreach (self::LEDGER_TABLES as $key => $table) {
                    $sums[$key] = (float) DB::table($table)
                        ->where('project_id', $project->id)
                        ->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])
                        ->sum('amount');
                }

                return array_merge(
                    ['id' => $project->id, 'name' => $project->name, 'status' => $project->status],
                    Project::computeFormulas($sums)
                );
            });

        return response()->json([
            'meta' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
            'totals' => $totals,
            'formulas' => Project::computeFormulas($totals),
            'projects' => $projects,
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $end = $request->filled('end_date') ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfDay();
        $start = $request->filled('start_date') ? Carbon::parse($request->start_date)->startOfDay() : Carbon::create(2000, 1, 1);

        return [$start, $end];
    }

    private function monthlySeries(Carbon $start, Carbon $end, array $filters = []): array
    {
        $months = [];
        $cursor = $start->copy()->startOfMonth();
        $lastMonth = $end->copy()->startOfMonth();
        while ($cursor->lte($lastMonth)) {
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
            $query = DB::table($table)->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()]);
            foreach ($filters as $column => $value) {
                $query->where($column, $value);
            }

            $rows = $query->selectRaw("{$monthExpr} as month, SUM(amount) as total")
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
