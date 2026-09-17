#!/bin/sh
set -eu

: "${DJ_SITE_URL:?Set the public site URL}"
: "${DJ_ADMIN_USER:?Set a non-default administrator username}"
: "${DJ_ADMIN_PASSWORD:?Set a strong administrator password}"
: "${DJ_ADMIN_EMAIL:?Set the administrator email}"

if wp core is-installed >/dev/null 2>&1; then
    echo 'WordPress is already installed. No content or settings have been changed.'
    echo 'Use the DEVDJAM control room to initialize missing pages if needed.'
    exit 0
fi

wp core install --url="$DJ_SITE_URL" --title='DEVDJAM' \
    --admin_user="$DJ_ADMIN_USER" --admin_password="$DJ_ADMIN_PASSWORD" \
    --admin_email="$DJ_ADMIN_EMAIL" --skip-email

# This block runs only after a successful fresh install above.
wp eval 'foreach (array("hello-world", "sample-page", "privacy-policy") as $slug) {
    $post = get_page_by_path($slug, OBJECT, array("post", "page"));
    if ($post && (int) $post->post_author === 1) wp_delete_post($post->ID, true);
}'
wp plugin activate devdjam-core
wp theme activate devdjam
wp option update blogdescription 'music, beats, thoughts, whatever.'
wp option update default_comment_status closed
wp option update default_ping_status closed
wp option update timezone_string Asia/Shanghai
wp eval 'devdjam_setup_site();'
wp language core install zh_CN --activate
echo 'DEVDJAM is ready. Articles and beats are empty. Open /wp-admin/admin.php?page=devdjam to begin.'
