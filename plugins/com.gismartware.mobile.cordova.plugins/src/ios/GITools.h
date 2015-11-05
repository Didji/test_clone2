#ifdef CORDOVA_FRAMEWORK
#import <CORDOVA/CDVPlugin.h>
#else
#import "CORDOVA/CDVPlugin.h"
#endif

#import <MapKit/MapKit.h>


@interface GITools :CDVPlugin {
    CDVInvokedUrlCommand* cordova_command;
    MKMapItem* start_mapItem;
    MKMapItem* dest_mapItem;
}
@property (nonatomic,retain) CDVInvokedUrlCommand* cordova_command;
@property (nonatomic,retain) MKMapItem* start_mapItem;
@property (nonatomic,retain) MKMapItem* dest_mapItem;

- (void) navigate:(CDVInvokedUrlCommand*)command;

@end
