<?php

namespace App\Http\Controllers;

use App\Models\OwnerPayment;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OwnerPaymentController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $this->authorize('viewAny', [OwnerPayment::class, $project]);

        $query = $project->ownerPayments();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payee_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('entry_date', 'desc')->get());
    }

    public function store(Request $request, Project $project)
    {
        $this->authorize('create', [OwnerPayment::class, $project]);

        $validated = $request->validate([
            'payee_name' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $validated['payee_name'] = $validated['payee_name'] ?? 'Owner';
        $validated['project_id'] = $project->id;
        $validated['created_by'] = Auth::id();

        $entry = OwnerPayment::create($validated);

        return response()->json([
            'message' => 'Owner payment added successfully',
            'entry' => $entry,
        ], 201);
    }

    public function update(Request $request, Project $project, OwnerPayment $entry)
    {
        $this->authorize('update', $entry);

        $validated = $request->validate([
            'payee_name' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'nullable|string|max:2000',
        ]);

        $validated['payee_name'] = $validated['payee_name'] ?? 'Owner';

        $entry->update($validated);

        return response()->json([
            'message' => 'Owner payment updated successfully',
            'entry' => $entry,
        ]);
    }

    public function destroy(Project $project, OwnerPayment $entry)
    {
        $this->authorize('delete', $entry);
        $entry->delete();

        return response()->json(['message' => 'Owner payment deleted successfully']);
    }
}
