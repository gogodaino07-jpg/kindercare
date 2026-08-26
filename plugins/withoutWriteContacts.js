const { withAndroidManifest } = require('expo/config-plugins');

// expo-contacts 플러그인이 READ_CONTACTS와 WRITE_CONTACTS를 항상 같이 붙이는데,
// 이 앱은 가족 초대 시 연락처를 Contacts.presentPicker()로 읽기만 하고 쓰기는
// 하지 않는다. app.json 옵션으로는 WRITE_CONTACTS만 뺄 수 없어서, prebuild 때
// expo-contacts가 넣어준 뒤 여기서 다시 제거한다.
function withoutWriteContacts(config) {
  return withAndroidManifest(config, (config) => {
    const permissions = config.modResults.manifest['uses-permission'];
    if (Array.isArray(permissions)) {
      config.modResults.manifest['uses-permission'] = permissions.filter(
        (permission) => permission.$['android:name'] !== 'android.permission.WRITE_CONTACTS'
      );
    }
    return config;
  });
}

module.exports = withoutWriteContacts;
