<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        $settings['logo_url'] = Setting::getCompanyBranding()['logo_url'];

        $faviconPath = $settings['favicon_path'] ?? null;
        $settings['favicon_url'] = $faviconPath ? asset($faviconPath) : asset('favicon.ico');

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin']) && ! Auth::user()->can('manage_settings')) {
            return response()->json(['message' => 'Unauthorized. Only Admins can modify settings.'], 403);
        }

        $validated = $request->validate([
            'company_name' => 'nullable|string|max:255',
            'company_address' => 'nullable|string|max:500',
            'company_email' => 'nullable|email|max:255',
            'company_phone' => 'nullable|string|max:50',
            'currency_symbol' => 'nullable|string|max:5',
        ]);

        foreach ($validated as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => strval($value)]);
        }

        $settings = Setting::all()->pluck('value', 'key');
        $settings['logo_url'] = Setting::getCompanyBranding()['logo_url'];

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => $settings,
        ]);
    }

    public function uploadLogo(Request $request)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin']) && ! Auth::user()->can('manage_settings')) {
            return response()->json(['message' => 'Unauthorized. Only Admins can modify settings.'], 403);
        }

        $request->validate([
            'logo' => 'required|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
        ]);

        $oldPath = Setting::where('key', 'logo_path')->value('value');
        if ($oldPath && file_exists(public_path($oldPath))) {
            @unlink(public_path($oldPath));
        }

        $file = $request->file('logo');
        $filename = 'logo_'.time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
        $file->move(public_path('branding'), $filename);
        $path = 'branding/'.$filename;

        Setting::updateOrCreate(['key' => 'logo_path'], ['value' => $path]);

        return response()->json([
            'message' => 'Company logo updated successfully. It will now appear on all generated documents.',
            'logo_url' => asset($path),
        ]);
    }

    public function removeLogo()
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin']) && ! Auth::user()->can('manage_settings')) {
            return response()->json(['message' => 'Unauthorized. Only Admins can modify settings.'], 403);
        }

        $path = Setting::where('key', 'logo_path')->value('value');
        if ($path && file_exists(public_path($path))) {
            @unlink(public_path($path));
        }

        Setting::where('key', 'logo_path')->delete();

        return response()->json(['message' => 'Company logo removed successfully.']);
    }

    public function uploadFavicon(Request $request)
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin']) && ! Auth::user()->can('manage_settings')) {
            return response()->json(['message' => 'Unauthorized. Only Admins can modify settings.'], 403);
        }

        $request->validate([
            'favicon' => 'required|image|mimes:png,ico,jpg,jpeg,gif,svg,webp|max:1024',
        ]);

        $oldPath = Setting::where('key', 'favicon_path')->value('value');
        if ($oldPath && file_exists(public_path($oldPath))) {
            @unlink(public_path($oldPath));
        }

        $file = $request->file('favicon');
        $filename = 'favicon_'.time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
        $file->move(public_path('branding'), $filename);
        $path = 'branding/'.$filename;

        Setting::updateOrCreate(['key' => 'favicon_path'], ['value' => $path]);

        return response()->json([
            'message' => 'Favicon updated successfully. Please refresh the page to see changes.',
            'favicon_url' => asset($path),
        ]);
    }

    public function removeFavicon()
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin']) && ! Auth::user()->can('manage_settings')) {
            return response()->json(['message' => 'Unauthorized. Only Admins can modify settings.'], 403);
        }

        $path = Setting::where('key', 'favicon_path')->value('value');
        if ($path && file_exists(public_path($path))) {
            @unlink(public_path($path));
        }

        Setting::where('key', 'favicon_path')->delete();

        return response()->json(['message' => 'Favicon removed successfully.']);
    }
}
