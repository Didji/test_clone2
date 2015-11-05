#import "GITools.h"

BOOL debugEnabled = FALSE;
#define DLog(fmt, ...) { \
if (debugEnabled) \
NSLog((@"[objc]: " fmt), ##__VA_ARGS__); \
}

/**
 * Actual implementation of the interface
 */
@implementation GITools
@synthesize cordova_command;
@synthesize start_mapItem;
@synthesize dest_mapItem;

- (void) navigate:(CDVInvokedUrlCommand*)command;
{
    self.cordova_command = command;
    
    DLog(@"called navigate()");
    
    NSString* destination = [command.arguments objectAtIndex:0];
    
    if (![destination isKindOfClass:[NSString class]]) {
        DLog(@"Error: missing destination argument");
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid arguments"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }
    
    [self openAppleMaps];
}

- (void) openAppleMaps
{
    // Check for iOS 6
    Class mapItemClass = [MKMapItem class];
    if (mapItemClass && [mapItemClass respondsToSelector:@selector(openMapsWithItems:launchOptions:)])
    {
        [self setAppleDestination];
    }else{
        DLog(@"Error: iOS 5 and below not supported");
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"iOS 5 and below not supported"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.cordova_command.callbackId];
    }
}

- (void) setAppleDestination
{
    DLog(@"Setting destination location");
    NSString* destination = [self.cordova_command.arguments objectAtIndex:0];
    CLGeocoder* geocoder = [[CLGeocoder alloc] init];

    NSArray* coords = [destination componentsSeparatedByString:@","];
    NSString* lat = [coords objectAtIndex:0];
    NSString* lon = [coords objectAtIndex:1];
    CLLocationCoordinate2D dest_coordinate = CLLocationCoordinate2DMake([lat doubleValue], [lon doubleValue]);
    MKPlacemark* placemark = [[MKPlacemark alloc] initWithCoordinate:dest_coordinate addressDictionary:nil];
    self.dest_mapItem = [[MKMapItem alloc] initWithPlacemark:placemark];
    [self.dest_mapItem setName:@"Destination"];

    // Try to retrieve display address for start location via reverse geocoding
    CLLocation* location = [[CLLocation alloc]initWithLatitude:[lat doubleValue] longitude:[lon doubleValue]];
    [geocoder reverseGeocodeLocation:location completionHandler:^(NSArray* placemarks, NSError* error) {
        if (error == nil && [placemarks count] > 0) {
            CLPlacemark* geocodedPlacemark = [placemarks lastObject];
            NSString* address = [self getAddressFromPlacemark:geocodedPlacemark];
            DLog(@"Reverse geocoded destination: %@", address);
           [self.dest_mapItem setName:address];
        }
        [self setAppleStart];
    }]; 
}

- (void) setAppleStart
{
    DLog(@"Setting start location");
    
    // Create an MKMapItem for start
    NSArray* coords = [start componentsSeparatedByString:@","];
    NSString* lat = [coords objectAtIndex:0];
    NSString* lon = [coords objectAtIndex:1];
    CLLocationCoordinate2D start_coordinate = CLLocationCoordinate2DMake([lat doubleValue], [lon doubleValue]);
    MKPlacemark* placemark = [[MKPlacemark alloc] initWithCoordinate:start_coordinate addressDictionary:nil];
    self.start_mapItem = [[MKMapItem alloc] initWithPlacemark:placemark];
    [self.start_mapItem setName:@"Start"];

    // Try to retrieve display address for start location via reverse geocoding
    CLLocation* location = [[CLLocation alloc]initWithLatitude:[lat doubleValue] longitude:[lon doubleValue]];
    [geocoder reverseGeocodeLocation:location completionHandler:^(NSArray* placemarks, NSError* error) {
        if (error == nil && [placemarks count] > 0) {
            CLPlacemark* geocodedPlacemark = [placemarks lastObject];
            NSString* address = [self getAddressFromPlacemark:geocodedPlacemark];
           DLog(@"Reverse geocoded start: %@", address);
           [self.start_mapItem setName:address];
        }
        [self invokeAppleMaps];
    }];
}

- (void) invokeAppleMaps
{
    // Set the directions mode
    NSDictionary* launchOptions = nil;
    launchOptions = @{MKLaunchOptionsDirectionsModeKey : MKLaunchOptionsDirectionsModeDriving};

    // Pass the start and destination map items and launchOptions to the Maps app
    DLog(@"Invoking Apple Maps...");
    [MKMapItem openMapsWithItems:@[self.start_mapItem, self.dest_mapItem] launchOptions:launchOptions];

    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.cordova_command.callbackId];
}

- (NSString*) getAddressFromPlacemark:(CLPlacemark*)placemark;
{
    NSString* address = @"";
    
    if (placemark.subThoroughfare){
        address = [NSString stringWithFormat:@"%@%@, ", address, placemark.subThoroughfare];
    }
    
    if (placemark.thoroughfare){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.thoroughfare];
    }
    
    if (placemark.locality){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.locality];
    }
    
    if (placemark.subAdministrativeArea){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.subAdministrativeArea];
    }
    
    if (placemark.administrativeArea){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.administrativeArea];
    }
    
    if (placemark.postalCode){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.postalCode];
    }
    
    if (placemark.country){
            address = [NSString stringWithFormat:@"%@%@, ", address, placemark.country];
    }
    
    return address;
}
@end