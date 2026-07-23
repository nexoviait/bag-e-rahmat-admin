<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    private const LEDGER_RELATIONS = [
        'budget' => 'budgets',
        'revenue' => 'revenues',
        'expenses' => 'expenses',
        'shareholder_investment' => 'shareholderInvestments',
        'owner_payments' => 'ownerPayments',
    ];

    private const LEDGER_TABLES = [
        'budget' => 'budgets',
        'revenue' => 'revenues',
        'expenses' => 'expenses',
        'shareholder_investment' => 'shareholder_investments',
        'owner_payments' => 'owner_payments',
    ];

    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Project::query()
            ->withSum('budgets as budget_sum', 'amount')
            ->withSum('revenues as revenue_sum', 'amount')
            ->withSum('expenses as expenses_sum', 'amount')
            ->withSum('shareholderInvestments as shareholder_investment_sum', 'amount')
            ->withSum('ownerPayments as owner_payments_sum', 'amount');

        if (! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            $query->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $projects = $query->orderBy('created_at', 'desc')->get()->map(function ($project) {
            $project->formulas = Project::computeFormulas($this->sumsFromAggregates($project));

            return $project;
        });

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Project::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,on_hold,completed,archived',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $validated['status'] = $validated['status'] ?? 'active';
        $validated['created_by'] = Auth::id();

        $project = Project::create($validated);

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project,
        ], 201);
    }

    public function show(Project $project)
    {
        $this->authorize('view', $project);

        $sums = $this->liveSums($project);

        return response()->json([
            'project' => $project->load(['users', 'creator']),
            'totals' => $sums,
            'formulas' => Project::computeFormulas($sums),
            'recent_activity' => $this->recentActivity($project),
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,on_hold,completed,archived',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $project->update($validated);

        return response()->json([
            'message' => 'Project updated successfully',
            'project' => $project,
        ]);
    }

    public function destroy(Project $project)
    {
        $this->authorize('delete', $project);
        $project->delete();

        return response()->json(['message' => 'Project deleted successfully']);
    }

    public function dashboard(Project $project)
    {
        $this->authorize('view', $project);

        $sums = $this->liveSums($project);

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
            ],
            'totals' => $sums,
            'formulas' => Project::computeFormulas($sums),
            'monthly' => $this->monthlySeries($project),
            'recent_activity' => $this->recentActivity($project),
        ]);
    }

    public function assignUsers(Request $request, Project $project)
    {
        $this->authorize('assignUsers', $project);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        foreach ($validated['user_ids'] as $userId) {
            ProjectAssignment::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $userId],
                ['assigned_by' => Auth::id()]
            );
        }

        return response()->json([
            'message' => 'Users assigned successfully',
            'project' => $project->load('users'),
        ]);
    }

    public function unassignUser(Project $project, User $user)
    {
        $this->authorize('assignUsers', $project);

        ProjectAssignment::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'User unassigned successfully']);
    }

    private function sumsFromAggregates(Project $project): array
    {
        return [
            'budget' => $project->budget_sum ?? 0,
            'revenue' => $project->revenue_sum ?? 0,
            'shareholder_investment' => $project->shareholder_investment_sum ?? 0,
            'expenses' => $project->expenses_sum ?? 0,
            'owner_payments' => $project->owner_payments_sum ?? 0,
        ];
    }

    private function liveSums(Project $project): array
    {
        return [
            'budget' => $project->total_budget,
            'revenue' => $project->total_revenue,
            'shareholder_investment' => $project->total_shareholder_investment,
            'expenses' => $project->total_expenses,
            'owner_payments' => $project->total_owner_payments,
        ];
    }

    private function recentActivity(Project $project, int $limit = 20): array
    {
        $labels = [
            'budget' => 'Budget',
            'revenue' => 'Revenue',
            'expenses' => 'Expense',
            'shareholder_investment' => 'Shareholder Investment',
            'owner_payments' => 'Owner Payment',
        ];

        $activity = collect();

        foreach (self::LEDGER_RELATIONS as $key => $relation) {
            $entries = $project->{$relation}()->orderBy('entry_date', 'desc')->limit($limit)->get();
            foreach ($entries as $entry) {
                $activity->push([
                    'type' => $labels[$key],
                    'id' => $entry->id,
                    'amount' => (float) $entry->amount,
                    'entry_date' => $entry->entry_date->toDateString(),
                    'description' => $entry->description,
                ]);
            }
        }

        return $activity->sortByDesc('entry_date')->take($limit)->values()->all();
    }

    private function monthlySeries(Project $project): array
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
                ->where('project_id', $project->id)
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
