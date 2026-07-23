<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const ASSIGNABLE_ROLES = ['Super Admin', 'Admin', 'Project Manager', 'Accountant', 'Viewer'];

    public function index()
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $users = User::with(['roles', 'assignedProjects'])->orderBy('created_at', 'desc')->get();

        return response()->json(UserResource::collection($users));
    }

    public function store(Request $request)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email|max:255',
            'password' => 'required|string|min:6',
            'roles' => 'required|array',
            'roles.*' => [Rule::in(self::ASSIGNABLE_ROLES)],
        ]);

        if (in_array('Super Admin', $validated['roles']) && ! Auth::user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only a Super Admin can grant the Super Admin role.'], 422);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->syncRoles($validated['roles']);

        return response()->json([
            'message' => 'User created successfully',
            'user' => new UserResource($user->load(['roles', 'assignedProjects'])),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email,'.$id.'|max:255',
            'password' => 'nullable|string|min:6',
            'roles' => 'required|array',
            'roles.*' => [Rule::in(self::ASSIGNABLE_ROLES)],
        ]);

        if (in_array('Super Admin', $validated['roles']) && ! Auth::user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only a Super Admin can grant the Super Admin role.'], 422);
        }

        if ($user->id === Auth::id() && ! in_array('Super Admin', $validated['roles'])) {
            return response()->json(['message' => 'You cannot remove the Super Admin role from yourself'], 422);
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        $user->syncRoles($validated['roles']);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => new UserResource($user->load(['roles', 'assignedProjects'])),
        ]);
    }

    public function destroy($id)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Cannot delete your own logged-in user account'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
