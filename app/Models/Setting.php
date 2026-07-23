<?php

namespace App\Models;

use App\Traits\LogsAuditable;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use LogsAuditable;

    protected $fillable = ['key', 'value'];

    /**
     * Company branding used to auto-populate every generated document so a single
     * logo/company-details update propagates everywhere without per-document changes.
     */
    public static function getCompanyBranding(): array
    {
        $values = self::whereIn('key', ['company_name', 'company_address', 'company_email', 'company_phone', 'logo_path'])
            ->pluck('value', 'key');

        $logoPath = $values['logo_path'] ?? null; // e.g. /branding/logo.png
        $logoDataUri = null;
        if ($logoPath && file_exists(public_path($logoPath))) {
            $mime = mime_content_type(public_path($logoPath));
            $contents = file_get_contents(public_path($logoPath));
            $logoDataUri = 'data:'.$mime.';base64,'.base64_encode($contents);
        }

        return [
            'name' => $values['company_name'] ?? 'Project Finance Admin',
            'address' => $values['company_address'] ?? '',
            'email' => $values['company_email'] ?? '',
            'phone' => $values['company_phone'] ?? '',
            'logo_url' => $logoPath ? asset($logoPath) : null,
            'logo_data_uri' => $logoDataUri,
        ];
    }
}
