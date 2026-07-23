<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ShareholderInvestment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShareholderInvestmentController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $this->authorize('viewAny', [ShareholderInvestment::class, $project]);

        $query = $project->shareholderInvestments();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('shareholder_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('entry_date', 'desc')->get());
    }

    public function store(Request $request, Project $project)
    {
        $this->authorize('create', [ShareholderInvestment::class, $project]);

        $validated = $request->validate([
            'shareholder_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $validated['project_id'] = $project->id;
        $validated['created_by'] = Auth::id();

        $entry = ShareholderInvestment::create($validated);

        return response()->json([
            'message' => 'Shareholder investment added successfully',
            'entry' => $entry,
        ], 201);
    }

    public function update(Request $request, Project $project, ShareholderInvestment $entry)
    {
        $this->authorize('update', $entry);

        $validated = $request->validate([
            'shareholder_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $entry->update($validated);

        return response()->json([
            'message' => 'Shareholder investment updated successfully',
            'entry' => $entry,
        ]);
    }

    public function destroy(Project $project, ShareholderInvestment $entry)
    {
        $this->authorize('delete', $entry);
        $entry->delete();

        return response()->json(['message' => 'Shareholder investment deleted successfully']);
    }
}
