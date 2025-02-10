import { animate, inView } from "motion";

export default function Animete(elname){
    inView( elname || '.animate', (el) => {
        animate([
            [ el, { rotate: 90, opacity: 0 }, { duration: 0 }],
            [ el, { rotate: 0, opacity: 1  }, { duration: 1 }]
        ]);
        // animate( element, { x: 0 }, { duration: 2 } );
        return () => {
            animate( el, { x: 0 }, { duration: 2 } );
        }
    });
}