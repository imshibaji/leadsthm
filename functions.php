<?php 
function custom_init() {
    add_theme_support('menus');
    add_theme_support('post-thumbnails');
    add_post_type_support('page', 'excerpt');

    if(!is_admin()) {
        wp_enqueue_style('font-awesome', get_template_directory_uri() . '/assets/css/all.min.css');
        wp_enqueue_style('leadthm', get_template_directory_uri() . '/assets/css/style.css');
        wp_enqueue_script('leadthm', get_template_directory_uri() . '/assets/js/bundle.min.js', array('jquery'), '1.0.0', true);
    }
}
add_action('init', 'custom_init');

function custom_menu_setup() {
    register_nav_menus(array(
        'primary_menu' => __('Primary Menu', 'leadthm'),
        'footer_menu' => __('Footer First Menu', 'leadthm'),
        'footer_menu_2' => __('Footer Second Menu', 'leadthm'),
        'social_menu' => __('Social Menu', 'leadthm'),
    ));
}
add_action('after_setup_theme', 'custom_menu_setup');

function custom_logo_setup() {
    add_theme_support('custom-logo', array(
        'height'      => 200,  // Set a default height
        'width'       => 200,  // Set a default width
        'flex-height' => true, // Allow flexible height
        'flex-width'  => true, // Allow flexible width
        'header-text' => array('site-title', 'site-description'), // Support text logo fallback
    ));
}
add_action('after_setup_theme', 'custom_logo_setup');


function add_custom_menu_classes($classes, $item, $args) {
    if ($args->theme_location == 'primary_menu') { // Change 'primary' to your menu location
        $classes[] = 'nav-li'; // Add custom class
    }
    return $classes;
}
add_filter('nav_menu_css_class', 'add_custom_menu_classes', 10, 3);


function customize_banner_image($wp_customize) {
    // Add Banner Section
    $wp_customize->add_section('custom_banner', array(
        'title'    => __('Header Banner', 'leadthm'),
        'priority' => 30,
    ));

    // Add a Number Input to Control Banner Count
    $wp_customize->add_setting('banner_count', array(
        'default'   => 1,
        'transport' => 'refresh',
        'type'      => 'theme_mod',
    ));
    $wp_customize->add_control('banner_count', array(
        'label'   => __('Number of Banners', 'leadthm'),
        'section' => 'custom_banner',
        'type'    => 'number',
        'input_attrs' => array(
            'min' => 1,
            'max' => 5,
        ),
    ));

    // Add Settings for Each Banner (1 to 5)
    for ($i = 1; $i <= 5; $i++) {
        $wp_customize->add_setting("banner_image_$i", array(
            'default'   => '',
            'transport' => 'refresh',
        ));
        $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, "banner_image_$i", array(
            'label'    => __("Upload Banner $i", 'leadthm'),
            'section'  => 'custom_banner',
            'settings' => "banner_image_$i",
            'active_callback' => function() use ($i) {
                return get_theme_mod('banner_count', 1) >= $i;
            },
        )));

        // Header Text for Each Banner
        $wp_customize->add_setting("banner_header_$i", array(
            'default'   => "Header Text $i",
            'transport' => 'refresh',
        ));
        $wp_customize->add_control("banner_header_$i", array(
            'label'   => __("Header for Banner $i", 'leadthm'),
            'section' => 'custom_banner',
            'type'    => 'text',
            'active_callback' => function() use ($i) {
                return get_theme_mod('banner_count', 1) >= $i;
            },
        ));

        // Subheader Text for Each Banner
        $wp_customize->add_setting("banner_subheader_$i", array(
            'default'   => "Subheader Text $i",
            'transport' => 'refresh',
        ));
        $wp_customize->add_control("banner_subheader_$i", array(
            'label'   => __("Subheader for Banner $i", 'leadthm'),
            'section' => 'custom_banner',
            'type'    => 'text',
            'active_callback' => function() use ($i) {
                return get_theme_mod('banner_count', 1) >= $i;
            },
        ));

        // Paragraph Text for Each Banner
        $wp_customize->add_setting("banner_paragraph_$i", array(
            'default'   => "Description for Banner $i",
            'transport' => 'refresh',
        ));
        $wp_customize->add_control("banner_paragraph_$i", array(
            'label'   => __("Paragraph for Banner $i", 'leadthm'),
            'section' => 'custom_banner',
            'type'    => 'textarea',
            'active_callback' => function() use ($i) {
                return get_theme_mod('banner_count', 1) >= $i;
            },
        ));

        // Banner Link for Each Banner
        $wp_customize->add_setting("banner_link_$i", array(
            'default'   => "http://ileadspro.com/#$i",
            'transport' => 'refresh',
        ));
        $wp_customize->add_control("banner_link_$i", array(
            'label'   => __("Link for Banner $i", 'leadthm'),
            'section' => 'custom_banner',
            'type'    => 'text',
            'active_callback' => function() use ($i) {
                return get_theme_mod('banner_count', 1) >= $i;
            },
        ));
    }
}
add_action('customize_register', 'customize_banner_image');


function customize_hero_banner($wp_customize){
    $wp_customize->add_section('hero_banner', array(
        'title'    => __('Hero Banner', 'leadthm'),
        'priority' => 30,
    ));

    $wp_customize->add_setting('hero_banner_image_style', array(
        'default'   => 'circle',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_image_style', array(
        'label'   => __('Title Section', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'select',
        'choices' => array(
            'circle' => 'Circle Image',
            'square' => 'Square Image',
        ),
    ));

    $wp_customize->add_setting('hero_banner_image', array(
        'default'   => get_template_directory_uri() . '/assets/imgs/ileadsPro-Business-Owner.jpg',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'hero_banner_image', array(
        'label'    => __('Upload Hero Banner Image', 'leadthm'),
        'section'  => 'hero_banner',
        'settings' => 'hero_banner_image',
    )));

    $wp_customize->add_setting('hero_banner_title', array(
        'default'   => 'Best Pre Sales, Leads Management, Quotations & Invoicing Software for Small Businesses',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_title', array(
        'label'   => __('Title Section', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_description', array(
        'default'   => '<a href="#" class="link">Join now More than hundred</a> of Small Businesses are using iLeadsPro to manage their leads, quotations, invoices and more.',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_description', array(
        'label'   => __('Description Section', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'textarea',
    ));

    $wp_customize->add_setting('hero_banner_download_text', array(
        'default'   => '(Free) Download Now',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_download_text', array(
        'label'   => __('Download Link', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_download_icon', array(
        'default'   => 'fa fa-solid fa-download',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_download_icon', array(
        'label'   => __('Download Icon', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_download_link', array(
        'default'   => '#',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_download_link', array(
        'label'   => __('Download Link for Hero Banner', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    ///
    $wp_customize->add_setting('hero_banner_premium_demo_text', array(
        'default'   => 'Book Demo For Premium',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_premium_demo_text', array(
        'label'   => __('Premium Demo Text', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_premium_demo_link', array(
        'default'   => '#',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_premium_demo_link', array(
        'label'   => __('Premium Demo Link', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_highlight', array(
        'default'   => '✔ Paid plans starting from ₹33/month',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_highlight', array(
        'label'   => __('Plan highlight Section', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('hero_banner_highlights', array(
        'default'   => '<p>⭐ 4.7+ Google Play Store</p><p>⭐ 4.6+ Apple Store</p><p>✅ ISO Certified</p>',
        'transport' => 'refresh',
    ));
    $wp_customize->add_control('hero_banner_highlights', array(
        'label'   => __('highlights Section', 'leadthm'),
        'section' => 'hero_banner',
        'type'    => 'text',
    ));
}
add_action('customize_register', 'customize_hero_banner');

function add_menu_icon_field($item_id, $item, $depth, $args) {
    $icon = get_post_meta($item_id, '_menu_item_icon', true);  
    ?>
    <p class="description description-wide">
        <label for="menu-item-icon-<?php echo $item_id; ?>">
            <?php _e('Menu Icon URL (or FontAwesome class)', 'leadthm'); ?><br>
            <input type="text" id="menu-item-icon-<?php echo $item_id; ?>" class="widefat" name="menu-item-icon[<?php echo $item_id; ?>]" value="<?php echo esc_attr($icon); ?>" placeholder="e.g., fa fa-home or image URL" />
        </label>
    </p>
    <?php
}
add_action('wp_nav_menu_item_custom_fields', 'add_menu_icon_field', 10, 4);

function save_menu_icon_field($menu_id, $menu_item_db_id) {
    if (isset($_POST['menu-item-icon'][$menu_item_db_id])) {
        update_post_meta($menu_item_db_id, '_menu_item_icon', sanitize_text_field($_POST['menu-item-icon'][$menu_item_db_id]));
    } else {
        delete_post_meta($menu_item_db_id, '_menu_item_icon');
    }
}
add_action('wp_update_nav_menu_item', 'save_menu_icon_field', 10, 2);

function display_menu_icons($items, $args) {
    foreach ($items as $item) {
        $icon = get_post_meta($item->ID, '_menu_item_icon', true);
        
        if ($icon) {
            // Check if it's a FontAwesome class or an image URL
            if (strpos($icon, 'fa ') === 0 || strpos($icon, 'fab ') === 0 || strpos($icon, 'far ') === 0 || strpos($icon, 'fas ') === 0 || strpos($icon, 'fal ') === 0) {
                $item->title = '<i class="' . esc_attr($icon) . '"></i> ' . $item->title;
            } else {
                $item->title = '<img src="' . esc_url($icon) . '" alt="Menu Icon" class="menu-icon" style="width: 20px; height: 20px; margin-right: 5px;"> ' . $item->title;
            }
        }
    }
    return $items;
}
add_filter('wp_nav_menu_objects', 'display_menu_icons', 10, 2);

