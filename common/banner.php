<?php
$banner_count = get_theme_mod('banner_count', 1);
?>
<div class="banner-wrapper mt-18">
    <?php for ($i = 1; $i <= $banner_count; $i++) : 
        $image = get_theme_mod("banner_image_$i");
        if ($image) : ?>
            <div class="banner">
                <img src="<?php echo esc_url( $image ?? get_template_directory_uri() . '/assets/imgs/Business-Growth.jpg' ); ?>" alt="<?php echo get_theme_mod("banner_header_$i", "Header Text $i"); ?>">
                <div class="caption">
                    <h2><?php echo get_theme_mod("banner_header_$i", "Header Text $i"); ?></h2>
                    <h3><?php echo get_theme_mod("banner_subheader_$i", "Subheader Text $i"); ?></h3>
                    <p><?php echo get_theme_mod("banner_paragraph_$i", "Description for Banner $i"); ?></p>
                </div>
            </div>
        <?php endif;
    endfor; ?>
</div>