<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        $pmRole = Role::firstOrCreate(['name' => 'Project Manager']);
        $accountantRole = Role::firstOrCreate(['name' => 'Accountant']);
        $viewerRole = Role::firstOrCreate(['name' => 'Viewer']);

        // 2. Permissions
        $permissions = [
            'view_budget', 'create_budget', 'edit_budget', 'delete_budget',
            'view_revenue', 'create_revenue', 'edit_revenue', 'delete_revenue',
            'view_expenses', 'create_expenses', 'edit_expenses', 'delete_expenses',
            'view_shareholders', 'create_shareholders', 'edit_shareholders', 'delete_shareholders',
            'view_owner_payments', 'create_owner_payments', 'edit_owner_payments', 'delete_owner_payments',
            'view_audit_logs', 'manage_settings',
        ];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Super Admin/Admin bypass every check in code — no permissions assigned to them.
        $fullLedgerAccess = array_values(array_filter($permissions, fn ($p) => ! in_array($p, ['view_audit_logs', 'manage_settings'])));
        $pmRole->syncPermissions($fullLedgerAccess);
        $accountantRole->syncPermissions($fullLedgerAccess);

        $viewOnly = array_values(array_filter($permissions, fn ($p) => str_starts_with($p, 'view_') && $p !== 'view_audit_logs'));
        $viewerRole->syncPermissions($viewOnly);

        // 3. Settings
        Setting::updateOrCreate(['key' => 'company_name'], ['value' => 'Project Finance Admin']);
        Setting::updateOrCreate(['key' => 'currency_symbol'], ['value' => '$']);

        // 4. Initial Super Admin user
        $adminUser = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin123'),
        ]);
        $adminUser->assignRole($superAdminRole);
    }
}
