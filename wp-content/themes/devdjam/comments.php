<?php
if (!defined('ABSPATH')) exit;
if (post_password_required()) return;
$require = (bool) get_option('require_name_email');
$commenter = wp_get_current_commenter();
?>
<section class="guestbook" id="comments">
    <fieldset class="panel"><legend><?php echo dj_text('guestbook'); ?> (<?php echo esc_html((string) get_comments_number()); ?>)</legend>
        <?php if (have_comments()) : ?>
            <ol class="guest-list"><?php wp_list_comments(array('callback' => 'dj_comment', 'style' => 'ol')); ?></ol>
            <?php the_comments_navigation(array('prev_text' => '<<', 'next_text' => '>>')); ?>
        <?php else : ?>
            <p class="guest-none"><?php echo dj_text('no entries yet'); ?></p>
        <?php endif; ?>
        <?php if (comments_open()) : ?>
            <p class="guest-title"><?php echo dj_text('sign the guestbook'); ?></p>
            <?php comment_form(array(
                'title_reply' => '', 'title_reply_before' => '', 'title_reply_after' => '',
                'comment_notes_before' => '', 'comment_notes_after' => '', 'logged_in_as' => '',
                'cancel_reply_before' => '', 'cancel_reply_after' => '',
                'class_container' => 'guest-form', 'label_submit' => 'send',
                'must_log_in' => '<p>' . dj_text('login required') . '</p>',
                'fields' => array(
                    'author' => '<p class="field"><label for="author">' . dj_text('name') . '</label><input id="author" name="author" type="text" value="' . esc_attr($commenter['comment_author']) . '" maxlength="60" required></p>',
                    'email' => '<p class="field"><label for="email">' . dj_text('email') . '</label><input id="email" name="email" type="email" value="' . esc_attr($commenter['comment_author_email']) . '" maxlength="100"' . ($require ? ' required' : '') . '></p>',
                ),
                'comment_field' => '<p class="field"><label for="comment">' . dj_text('message') . '</label><textarea id="comment" name="comment" rows="4" maxlength="2000" required></textarea></p>',
            )); ?>
        <?php endif; ?>
    </fieldset>
</section>
