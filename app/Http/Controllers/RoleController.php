<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const CORE_ROLES = ['Super Admin', 'Admin'];

    public function index()
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $roles = Role::with('permissions')->withCount('users')->orderBy('created_at', 'desc')->get();

        return response()->json($roles);
    }

    public function getPermissions()
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $permissions = [
            ['name' => 'view_budget', 'label' => 'View Budget'],
            ['name' => 'create_budget', 'label' => 'Create Budget Entries'],
            ['name' => 'edit_budget', 'label' => 'Edit Budget Entries'],
            ['name' => 'delete_budget', 'label' => 'Delete Budget Entries'],
            ['name' => 'view_revenue', 'label' => 'View Revenue'],
            ['name' => 'create_revenue', 'label' => 'Create Revenue Entries'],
            ['name' => 'edit_revenue', 'label' => 'Edit Revenue Entries'],
            ['name' => 'delete_revenue', 'label' => 'Delete Revenue Entries'],
            ['name' => 'view_expenses', 'label' => 'View Expenses'],
            ['name' => 'create_expenses', 'label' => 'Create Expense Entries'],
            ['name' => 'edit_expenses', 'label' => 'Edit Expense Entries'],
            ['name' => 'delete_expenses', 'label' => 'Delete Expense Entries'],
            ['name' => 'view_shareholders', 'label' => 'View Shareholder Investments'],
            ['name' => 'create_shareholders', 'label' => 'Create Shareholder Investments'],
            ['name' => 'edit_shareholders', 'label' => 'Edit Shareholder Investments'],
            ['name' => 'delete_shareholders', 'label' => 'Delete Shareholder Investments'],
            ['name' => 'view_owner_payments', 'label' => 'View Owner Payments'],
            ['name' => 'create_owner_payments', 'label' => 'Create Owner Payments'],
            ['name' => 'edit_owner_payments', 'label' => 'Edit Owner Payments'],
            ['name' => 'delete_owner_payments', 'label' => 'Delete Owner Payments'],
            ['name' => 'view_audit_logs', 'label' => 'View Security Audit Trail'],
            ['name' => 'manage_settings', 'label' => 'Manage Global Settings'],
        ];

        // Ensure they exist in database
        foreach ($permissions as $p) {
            Permission::firstOrCreate([
                'name' => $p['name'],
                'guard_name' => 'web',
            ]);
        }

        return response()->json($permissions);
    }

    public function store(Request $request)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (! empty($validated['permissions'])) {
            foreach ($validated['permissions'] as $pName) {
                Permission::firstOrCreate([
                    'name' => $pName,
                    'guard_name' => 'web',
                ]);
            }
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'Role created successfully',
            'role' => $role->load('permissions'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = Role::findOrFail($id);

        if (in_array($role->name, self::CORE_ROLES)) {
            return response()->json(['message' => 'Cannot edit system core roles'], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name,'.$id.'|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $role->update([
            'name' => $validated['name'],
        ]);

        if (isset($validated['permissions'])) {
            foreach ($validated['permissions'] as $pName) {
                Permission::firstOrCreate([
                    'name' => $pName,
                    'guard_name' => 'web',
                ]);
            }
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => $role->load('permissions'),
        ]);
    }

    public function destroy($id)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = Role::findOrFail($id);

        if (in_array($role->name, self::CORE_ROLES)) {
            return response()->json(['message' => 'Cannot delete system core roles'], 422);
        }

        if ($role->users()->count() > 0) {
            return response()->json(['message' => 'Cannot delete role assigned to active users'], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}
