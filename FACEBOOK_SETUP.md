# Facebook Login Setup

## 1. Criar Facebook App

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie uma nova aplicação
3. Adicione o produto "Facebook Login"
4. Configure as seguintes URLs de redirecionamento:
   - `rockover://facebook`
   - `fb{YOUR_APP_ID}://authorize`

## 2. Configurar App ID

1. Copie o App ID e Client Token da sua aplicação Facebook
2. Substitua no arquivo `app.json`:
   ```json
   {
     "appID": "YOUR_FACEBOOK_APP_ID",
     "clientToken": "YOUR_FACEBOOK_CLIENT_TOKEN",
     "scheme": "fb{YOUR_FACEBOOK_APP_ID}"
   }
   ```

## 3. Configurar Supabase

1. No painel do Supabase, vá para Authentication > Providers
2. Ative o provider "Facebook"
3. Configure:
   - Client ID: Seu Facebook App ID
   - Client Secret: Seu Facebook App Secret
   - Redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

## 4. Executar SQL

Execute o arquivo `supabase-facebook-function.sql` no SQL Editor do Supabase para criar a função `upsert_facebook_user`.

## 5. Configurações Android

Adicione no arquivo `android/app/src/main/res/values/strings.xml`:
```xml
<string name="facebook_app_id">YOUR_FACEBOOK_APP_ID</string>
<string name="facebook_client_token">YOUR_FACEBOOK_CLIENT_TOKEN</string>
```

Adicione no arquivo `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id"/>
<meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token"/>

<activity android:name="com.facebook.FacebookActivity"
    android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
    android:label="@string/app_name" />
<activity
    android:name="com.facebook.CustomTabActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="@string/facebook_app_id" />
    </intent-filter>
</activity>
```

## 6. Configurações iOS

Adicione no arquivo `ios/RockOver/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>facebook</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fb{YOUR_FACEBOOK_APP_ID}</string>
        </array>
    </dict>
</array>
<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
<key>FacebookClientToken</key>
<string>YOUR_FACEBOOK_CLIENT_TOKEN</string>
<key>FacebookDisplayName</key>
<string>Rock Over</string>
```

## 7. Rebuild do Projeto

Após configurar tudo, execute:
```bash
npx expo run:android
# ou
npx expo run:ios
```

## Permissões Solicitadas

- `public_profile`: Para obter nome e foto do usuário
- `email`: Para obter o email do usuário (necessário para login) 