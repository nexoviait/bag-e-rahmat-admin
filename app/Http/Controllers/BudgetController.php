<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BudgetController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $this->authorize('viewAny', [Budget::class, $project]);

        $query = $project->budgets();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('search')) {
            $query->where('description', 'like', '%'.$request->search.'%');
        }

        return response()->json($query->orderBy('entry_date', 'desc')->get());
    }

    public function store(Request $request, Project $project)
    {
        $this->authorize('create', [Budget::class, $project]);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $validated['project_id'] = $project->id;
        $validated['created_by'] = Auth::id();

        $entry = Budget::create($validated);

        return response()->json([
            'message' => 'Budget entry added successfully',
            'entry' => $entry,
        ], 201);
    }

    public function update(Request $request, Project $project, Budget $entry)
    {
        $this->authorize('update', $entry);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $entry->update($validated);

        return response()->json([
            'message' => 'Budget entry updated successfully',
            'entry' => $entry,
        ]);
    }

    public function destroy(Project $project, Budget $entry)
    {
        $this->authorize('delete', $entry);
        $entry->delete();

        return response()->json(['message' => 'Budget entry deleted successfully']);
    }
}
