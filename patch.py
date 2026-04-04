code = open('frontend/app/patient/page.tsx', encoding='utf-8').read()
insert = '''
          {/* AI Adaptive Plan */}
          {adaptivePlan && (
            <Card className="border-primary/50 shadow-sm mt-6">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI Adaptive Plan</CardTitle>
                  </div>
                  <Badge variant="default">Auto-adjusted</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-primary mb-4">
                  AI adjusted your plan based on performance
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Sets & Reps</p>
                    <p className="font-bold text-foreground text-lg">{adaptivePlan.sets} &times; {adaptivePlan.reps}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Intensity</p>
                    <p className="font-bold text-foreground text-lg capitalize">{adaptivePlan.intensity}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Reasoning</p>
                    <p className="font-medium text-foreground text-sm">{adaptivePlan.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

'''
code = code.replace('          {/* Active Prescriptions */}', insert + '          {/* Active Prescriptions */}')
open('frontend/app/patient/page.tsx', 'w', encoding='utf-8').write(code)
